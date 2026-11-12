import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";

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
        "NLP",
        "RAG",
        "LLMs",
        "Vector Databases",
        "Model Evaluation",
        "AI Agents",
        "Embeddings & Semantic Search",
        "PyTorch & Model Training",
        "Feature Engineering"
    ],
    "System Architect": [
        "Distributed Systems",
        "Scalability & Load Balancing",
        "Caching Strategies",
        "Database Sharding & Replication",
        "Message Queues & Event Streaming",
        "API Gateway & Rate Limiting",
        "High Availability & Fault Tolerance",
        "CAP Theorem & Consistency"
    ],
    "DevOps Engineer": [
        "Docker & Containerization",
        "Kubernetes & Orchestration",
        "CI/CD Pipelines",
        "Infrastructure as Code (Terraform)",
        "Linux & Shell Scripting",
        "Monitoring & Prometheus",
        "Nginx & Load Balancing",
        "GitOps & Deployments"
    ],
    "Cloud Engineer": [
        "Cloud Architecture (AWS / GCP)",
        "VPC & Cloud Networking",
        "IAM & Cloud Security",
        "Serverless Compute (Lambda/Functions)",
        "Cloud Storage (S3 / GCS)",
        "Auto-Scaling & Redundancy",
        "Cost Optimization & FinOps"
    ],
    "Data Engineer": [
        "Data Warehousing",
        "ETL Pipelines",
        "Apache Spark",
        "BigQuery & Data Lakes",
        "Batch & Streaming Ingestion",
        "Data Modeling & Schemas",
        "Airflow & Orchestration"
    ],
    "Security Engineer": [
        "Application Security",
        "OWASP Top 10",
        "Cryptography & Encryption",
        "Authentication & OAuth2",
        "Penetration Testing & Audits",
        "Cloud Security Compliance"
    ]
};

export const SKILL_METADATA = [
    {
        title: "Backend Developer",
        category: "Web Engineering",
        description: "APIs, distributed systems, caching, SQL/NoSQL databases, and server-side runtime performance.",
        tags: ["REST APIs", "Node.js", "SQL", "MongoDB", "Redis & Caching", "System Design"]
    },
    {
        title: "Frontend Developer",
        category: "Web Engineering",
        description: "Modern client architecture, React ecosystem, state management, CSS layouts, and web performance.",
        tags: ["React", "JavaScript", "TypeScript", "State Management", "Accessibility"]
    },
    {
        title: "Full Stack Developer",
        category: "Web Engineering",
        description: "End-to-end web engineering, UI integration, robust backend APIs, and database migrations.",
        tags: ["React", "Node.js", "Full Stack", "GraphQL", "Auth & JWT"]
    },
    {
        title: "Software Engineer",
        category: "Core Computer Science",
        description: "Data structures, algorithmic problem solving, clean code, OOP, and computational complexity.",
        tags: ["Data Structures", "Algorithms", "Binary Trees", "Dynamic Programming"]
    },
    {
        title: "AI/ML Engineer",
        category: "AI & Emerging Tech",
        description: "Machine learning architectures, neural networks, LLMs, RAG pipelines, and vector databases.",
        tags: ["Machine Learning", "LLMs", "RAG", "Vector Databases", "Deep Learning"]
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

    const paramSkill = searchParams.get("skill") || searchParams.get("domain") || searchParams.get("role") || "";
    const requestedStep = searchParams.get("step");

    // Match initial skill
    const initialSkill = useMemo(() => {
        if (!paramSkill) return null;
        const matched = SKILL_METADATA.find(
            (s) => s.title.toLowerCase() === paramSkill.toLowerCase() ||
                   paramSkill.toLowerCase().includes(s.title.toLowerCase())
        );
        return matched ? matched.title : paramSkill;
    }, [paramSkill]);

    // View state: 'select' (skill selection screen) or 'config' (configuration screen)
    const [viewMode, setViewMode] = useState(() => {
        if (requestedStep === "select" || !initialSkill) return "select";
        return "config";
    });

    const [selectedSkill, setSelectedSkill] = useState(initialSkill || "Backend Developer");

    // Filter states for Step 2: Skill Selection
    const [selectedCategory, setSelectedCategory] = useState("All Disciplines");
    const [searchFilter, setSearchFilter] = useState("");

    // Step 3 Configuration States
    const availableCurriculumTopics = useMemo(() => {
        return DOMAIN_TOPICS_MAP[selectedSkill] || [
            "Core Concepts",
            "Architecture & Design",
            "Performance Optimization",
            "Best Practices",
            "Error Handling"
        ];
    }, [selectedSkill]);

    const [selectedPredefinedTopics, setSelectedPredefinedTopics] = useState(() => {
        const defaultList = DOMAIN_TOPICS_MAP[selectedSkill] || [];
        return defaultList.slice(0, 3);
    });

    const [dropdownSelectedTopic, setDropdownSelectedTopic] = useState("");

    // Sync topics when selectedSkill changes
    useEffect(() => {
        const list = DOMAIN_TOPICS_MAP[selectedSkill] || [];
        setSelectedPredefinedTopics(list.slice(0, 3));
        setDropdownSelectedTopic("");
    }, [selectedSkill]);

    // Custom Topics
    const [customTopics, setCustomTopics] = useState([]);
    const [customInput, setCustomInput] = useState("");

    // Assessment Parameters
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState("Medium");
    const [focusFormat, setFocusFormat] = useState("theory");

    // Submission states
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState("");

    // Filtered skill cards for Step 2
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
            if (selectedPredefinedTopics.length === 1 && customTopics.length === 0) return;
            setSelectedPredefinedTopics(selectedPredefinedTopics.filter((t) => t !== topic));
        } else {
            setSelectedPredefinedTopics([...selectedPredefinedTopics, topic]);
        }
    };

    const handleAddTopicFromDropdown = (e) => {
        const val = e.target.value;
        if (!val) return;
        if (!selectedPredefinedTopics.includes(val)) {
            setSelectedPredefinedTopics([...selectedPredefinedTopics, val]);
        }
        setDropdownSelectedTopic("");
    };

    const handleAddCustomTopic = (e) => {
        if (e) e.preventDefault();
        const trimmed = customInput.trim();
        if (!trimmed) return;
        if (customTopics.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            setCustomInput("");
            return;
        }
        setCustomTopics([...customTopics, trimmed]);
        setCustomInput("");
    };

    const handleRemoveCustomTopic = (topic) => {
        if (customTopics.length === 1 && selectedPredefinedTopics.length === 0) return;
        setCustomTopics(customTopics.filter((t) => t !== topic));
    };

    const handleStartAssessment = async () => {
        if (starting) return;
        setStarting(true);
        setError("");

        try {
            const durationMinutes = questionCount <= 3 ? 15 : questionCount <= 5 ? 25 : 40;
            const allSelectedTopics = Array.from(new Set([
                ...selectedPredefinedTopics,
                ...customTopics
            ])).filter(Boolean);

            const payload = {
                roleTitle: selectedSkill,
                domain: selectedSkill,
                selectedTopics: allSelectedTopics,
                customTopics: customTopics,
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

    // ==============================================================
    // STEP 2: SKILL SELECTION SCREEN
    // ==============================================================
    if (viewMode === "select") {
        return (
            <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Header */}
                <div>
                    <div style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#2563eb",
                        marginBottom: "6px"
                    }}>
                        STEP 2 · CHOOSE A TECHNICAL SKILL
                    </div>
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: "800",
                        color: "#0f172a",
                        letterSpacing: "-0.03em",
                        margin: "0 0 6px 0"
                    }}>
                        Select Your Target Skill
                    </h1>
                    <p style={{ fontSize: "15px", color: "#475569", margin: 0 }}>
                        Pick the primary technical discipline you want to master. On the next step, you will choose specific curriculum topics and practice parameters.
                    </p>
                </div>

                {/* Filter and Search Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px"
                }}>
                    {/* Category Filter Pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{
                                        padding: "6px 14px",
                                        borderRadius: "20px",
                                        border: isSelected ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                        backgroundColor: isSelected ? "#eff6ff" : "#f8fafc",
                                        color: isSelected ? "#1d4ed8" : "#475569",
                                        fontSize: "12.5px",
                                        fontWeight: isSelected ? "700" : "500",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div style={{ position: "relative", minWidth: "240px" }}>
                        <input
                            type="text"
                            placeholder="Filter skills or topics..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 12px 8px 30px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                backgroundColor: "#ffffff"
                            }}
                        />
                        <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#94a3b8" }}>
                            🔍
                        </span>
                    </div>
                </div>

                {/* Skill Cards Grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                    gap: "16px"
                }}>
                    {filteredSkills.map((item) => (
                        <div
                            key={item.title}
                            onClick={() => handleSelectSkillCard(item.title)}
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "14px",
                                padding: "22px",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: "all 0.18s ease",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#2563eb";
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.08)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#e2e8f0";
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                            }}
                        >
                            <div>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "10px"
                                }}>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "#64748b",
                                        backgroundColor: "#f1f5f9",
                                        padding: "3px 8px",
                                        borderRadius: "6px"
                                    }}>
                                        {item.category}
                                    </span>
                                    <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: "600" }}>
                                        Configure →
                                    </span>
                                </div>

                                <h3 style={{
                                    fontSize: "18px",
                                    fontWeight: "800",
                                    color: "#0f172a",
                                    margin: "0 0 8px 0"
                                }}>
                                    {item.title}
                                </h3>

                                <p style={{
                                    fontSize: "13px",
                                    color: "#475569",
                                    lineHeight: "1.45",
                                    margin: "0 0 16px 0"
                                }}>
                                    {item.description}
                                </p>
                            </div>

                            {/* Tags Preview */}
                            <div>
                                <div style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#64748b",
                                    marginBottom: "6px"
                                }}>
                                    Curriculum Preview:
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {item.tags.map((t) => (
                                        <span
                                            key={t}
                                            style={{
                                                fontSize: "11.5px",
                                                fontWeight: "600",
                                                color: "#334155",
                                                backgroundColor: "#f8fafc",
                                                border: "1px solid #e2e8f0",
                                                padding: "2px 8px",
                                                borderRadius: "6px"
                                            }}
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: "center", marginTop: "12px" }}>
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
    // STEP 3: ASSESSMENT CONFIGURATION SCREEN
    // ==============================================================
    const totalSelectedTopicsCount = selectedPredefinedTopics.length + customTopics.length;

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Header */}
            <div>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#2563eb",
                    marginBottom: "6px"
                }}>
                    03 / ONE SKILL AT A TIME
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Configure Your Focused Assessment
                </h1>
                <p style={{ fontSize: "15px", color: "#475569", margin: 0 }}>
                    Select specific topics from your chosen skill curriculum, add custom specialized topics, and set exam intensity.
                </p>
            </div>

            {/* 2-Column Split: Form + Review Sidebar */}
            <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "28px", alignItems: "start" }}>
                
                {/* Left Column: Form Sections */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    
                    {/* Small Clean Confirmation Section (No Duplicate Selection) */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "18px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                    }}>
                        <div>
                            <span style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "#64748b",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                display: "block",
                                marginBottom: "2px"
                            }}>
                                Your Selected Skill
                            </span>
                            <div style={{ fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>
                                {selectedSkill}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleBackToSkillSelection}
                            style={{
                                padding: "7px 14px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12.5px",
                                fontWeight: "600",
                                color: "#2563eb",
                                backgroundColor: "#f8fafc",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                            }}
                        >
                            Change Skill
                        </button>
                    </div>

                    {/* SECTION A: DOMAIN-SPECIFIC TOPIC SELECTION */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <div style={{ marginBottom: "16px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                A · TOPIC SELECTION FOR {selectedSkill.toUpperCase()}
                            </span>
                            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "2px 0 4px 0" }}>
                                Curriculum Topics
                            </h2>
                            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                                Select topics from the dedicated dropdown or click individual topic pills below to add or remove them.
                            </p>
                        </div>

                        {/* Domain-specific Topic Dropdown */}
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                                Select topic from dropdown:
                            </label>
                            <select
                                value={dropdownSelectedTopic}
                                onChange={handleAddTopicFromDropdown}
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    backgroundColor: "#f8fafc",
                                    color: "#0f172a",
                                    cursor: "pointer"
                                }}
                            >
                                <option value="">-- Choose from {selectedSkill} topics to add --</option>
                                {availableCurriculumTopics.map((topic) => (
                                    <option key={topic} value={topic}>
                                        {topic} {selectedPredefinedTopics.includes(topic) ? "✓ (Selected)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Interactive Clickable Topic Chips Grid */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {availableCurriculumTopics.map((topic) => {
                                const isSelected = selectedPredefinedTopics.includes(topic);
                                return (
                                    <button
                                        key={topic}
                                        type="button"
                                        onClick={() => togglePredefinedTopic(topic)}
                                        style={{
                                            padding: "8px 14px",
                                            borderRadius: "20px",
                                            border: isSelected ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                            backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                            color: isSelected ? "#1d4ed8" : "#334155",
                                            fontSize: "13px",
                                            fontWeight: isSelected ? "700" : "500",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        <span>{topic}</span>
                                        {isSelected && (
                                            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "800" }}>✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION B: CUSTOM TOPIC ENTRY */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <div style={{ marginBottom: "16px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                B · CUSTOM TOPIC ENTRY
                            </span>
                            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "2px 0 4px 0" }}>
                                Add Specialized Topics
                            </h2>
                            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                                Enter specialized topics, internal libraries, or niche architectural patterns. AI will ground questions in your custom entries.
                            </p>
                        </div>

                        {/* Input form */}
                        <form onSubmit={handleAddCustomTopic} style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                            <input
                                type="text"
                                placeholder="e.g. Distributed Lock with Redlock, Vector Index Optimization..."
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13px",
                                    backgroundColor: "#f8fafc"
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    padding: "10px 18px",
                                    borderRadius: "8px",
                                    backgroundColor: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                + Add Topic
                            </button>
                        </form>

                        {/* Custom Topics Chips */}
                        {customTopics.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {customTopics.map((topic) => (
                                    <div
                                        key={topic}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: "20px",
                                            backgroundColor: "#f0fdf4",
                                            border: "1.5px solid #16a34a",
                                            color: "#15803d",
                                            fontSize: "12.5px",
                                            fontWeight: "700",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <span>✨ {topic}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustomTopic(topic)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#15803d",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                lineHeight: 1,
                                                padding: 0
                                            }}
                                            title="Remove topic"
                                        >
                                            ✕
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

                    {/* SECTION C: ASSESSMENT PARAMETERS */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            C · ASSESSMENT PARAMETERS
                        </span>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "2px 0 16px 0" }}>
                            Format & Intensity
                        </h2>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Question Count
                                </label>
                                <select
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        backgroundColor: "#ffffff"
                                    }}
                                >
                                    <option value={3}>3 questions (Fast Check · 15m)</option>
                                    <option value={5}>5 questions (Standard · 25m)</option>
                                    <option value={8}>8 questions (Deep Dive · 40m)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Difficulty Level
                                </label>
                                <select
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        backgroundColor: "#ffffff"
                                    }}
                                >
                                    <option value="Easy">Easy (Foundational)</option>
                                    <option value="Medium">Medium (Applied Practice)</option>
                                    <option value="Hard">Hard (Expert Edge Cases)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Question Mode
                                </label>
                                <select
                                    value={focusFormat}
                                    onChange={(e) => setFocusFormat(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        backgroundColor: "#ffffff"
                                    }}
                                >
                                    <option value="theory">Reasoning & Concepts</option>
                                    <option value="coding">Hands-on Code Implementation</option>
                                    <option value="mixed">Mixed (Concepts + Code)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Summary Card */}
                <div>
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "26px",
                        position: "sticky",
                        top: "24px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
                    }}>
                        <div style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#16a34a",
                            marginBottom: "8px"
                        }}>
                            CONFIRMED TARGET SKILL
                        </div>

                        <h3 style={{
                            fontSize: "20px",
                            fontWeight: "800",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            {selectedSkill}
                        </h3>

                        {/* Clean Breakdown without duplicate domain selection */}
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
                                <span style={{ color: "#64748b" }}>Target Skill</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{selectedSkill}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Active Topics</span>
                                <span style={{ fontWeight: "700", color: "#2563eb" }}>
                                    {totalSelectedTopicsCount} selected
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Predefined</span>
                                <span style={{ fontWeight: "600", color: "#475569" }}>
                                    {selectedPredefinedTopics.length} topics
                                </span>
                            </div>
                            {customTopics.length > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#64748b" }}>Custom Niche</span>
                                    <span style={{ fontWeight: "600", color: "#16a34a" }}>
                                        {customTopics.length} custom
                                    </span>
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Questions</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{questionCount} questions</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Difficulty</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{difficulty}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Format</span>
                                <span style={{ fontWeight: "600", color: "#0f172a", textTransform: "capitalize" }}>{focusFormat}</span>
                            </div>
                        </div>

                        <p style={{
                            fontSize: "12px",
                            color: "#64748b",
                            lineHeight: "1.5",
                            margin: "0 0 20px 0"
                        }}>
                            AI will ground assessment questions in your selected curriculum topics and custom entries for <strong>{selectedSkill}</strong>.
                        </p>

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

                        <button
                            type="button"
                            onClick={handleStartAssessment}
                            disabled={starting}
                            style={{
                                width: "100%",
                                backgroundColor: starting ? "#94a3b8" : "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "700",
                                cursor: starting ? "not-allowed" : "pointer",
                                marginBottom: "10px",
                                boxShadow: "0 2px 4px rgba(30,58,138,0.15)"
                            }}
                        >
                            {starting ? "Generating Focused Assessment..." : `Start ${selectedSkill} Assessment →`}
                        </button>

                        <button
                            type="button"
                            onClick={handleBackToSkillSelection}
                            style={{
                                width: "100%",
                                background: "none",
                                border: "none",
                                color: "#64748b",
                                fontSize: "12.5px",
                                fontWeight: "500",
                                cursor: "pointer",
                                padding: "6px"
                            }}
                        >
                            ← Change Target Skill
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
