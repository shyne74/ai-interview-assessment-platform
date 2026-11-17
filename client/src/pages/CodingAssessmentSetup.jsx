import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";

const CODING_TOPICS = [
    { id: "all", label: "All Topics", tags: [] },
    { id: "arrays", label: "Arrays & Two Pointers", tags: ["arrays", "two-pointer technique", "sliding window"] },
    { id: "strings", label: "Strings", tags: ["strings", "hashing"] },
    { id: "dp", label: "Dynamic Programming", tags: ["dp", "dynamic programming"] },
    { id: "greedy", label: "Greedy Algorithms", tags: ["greedy"] },
    { id: "math", label: "Math & Number Theory", tags: ["math"] },
    { id: "binary-search", label: "Binary Search", tags: ["binary search", "sortings"] },
    { id: "implementation", label: "Implementation & Brute Force", tags: ["implementation", "brute force"] },
    { id: "data-structures", label: "Data Structures", tags: ["data structures", "hashing"] }
];

export default function CodingAssessmentSetup() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const paramProblemId = searchParams.get("problemId") || "";
    const paramTopic = searchParams.get("topic") || "all";

    const [selectedTopicId, setSelectedTopicId] = useState(paramTopic);
    const [difficulty, setDifficulty] = useState("all");
    const [problemCount, setProblemCount] = useState(2);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState("");

    const [metaData, setMetaData] = useState(null);
    const [problems, setProblems] = useState([]);
    const [selectedProblemIds, setSelectedProblemIds] = useState([]);

    // 1. Fetch Meta Statistics
    useEffect(() => {
        let isMounted = true;
        async function fetchMeta() {
            try {
                const res = await api.get("/coding/meta");
                if (isMounted && res.data) {
                    setMetaData(res.data);
                }
            } catch (err) {
                console.warn("Could not load coding meta stats:", err);
            }
        }
        fetchMeta();
        return () => { isMounted = false; };
    }, []);

    // 2. Fetch Matching Codeforces Problems
    useEffect(() => {
        let isMounted = true;
        async function fetchMatchingProblems() {
            setLoading(true);
            setError("");
            try {
                const topicObj = CODING_TOPICS.find(t => t.id === selectedTopicId) || CODING_TOPICS[0];
                const tagParams = topicObj.tags.join(",");

                let url = `/coding/problems?limit=${Math.max(problemCount, 6)}`;
                if (tagParams) url += `&topics=${encodeURIComponent(tagParams)}`;
                if (difficulty !== "all") url += `&difficulty=${encodeURIComponent(difficulty)}`;

                const res = await api.get(url);
                if (!isMounted) return;

                const fetched = res.data.problems || [];
                setProblems(fetched);

                if (paramProblemId) {
                    setSelectedProblemIds([paramProblemId]);
                } else {
                    setSelectedProblemIds(fetched.slice(0, problemCount).map(p => p._id));
                }
            } catch (err) {
                if (isMounted) {
                    setError("Failed to retrieve matching Codeforces problems. Please adjust filters.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchMatchingProblems();
        return () => { isMounted = false; };
    }, [selectedTopicId, difficulty, problemCount, paramProblemId]);

    const toggleProblemSelection = (id) => {
        if (selectedProblemIds.includes(id)) {
            if (selectedProblemIds.length > 1) {
                setSelectedProblemIds(selectedProblemIds.filter(pid => pid !== id));
            }
        } else {
            setSelectedProblemIds([...selectedProblemIds, id]);
        }
    };

    const handleStartCodingExam = async () => {
        if (starting) return;
        setStarting(true);
        setError("");

        try {
            const activeTopicObj = CODING_TOPICS.find(t => t.id === selectedTopicId);
            const activeDomain = activeTopicObj && activeTopicObj.id !== "all" ? activeTopicObj.label : "Algorithms & Problem Solving";
            const durationMinutes = selectedProblemIds.length === 1 ? 30 : selectedProblemIds.length === 2 ? 45 : 60;

            const payload = {
                roleTitle: "Coding",
                domain: activeDomain,
                assessmentType: "coding",
                difficulty: difficulty === "all" ? "medium" : difficulty,
                limit: selectedProblemIds.length,
                durationSeconds: durationMinutes * 60,
                questionIds: selectedProblemIds
            };

            const res = await api.post("/interviews", payload);
            const interviewId = res.data.interviewId;

            localStorage.setItem("activeInterviewId", interviewId);
            navigate(`/interview/${interviewId}`, { replace: true });
        } catch (err) {
            console.error("Failed to start coding session:", err);
            setError(err.response?.data?.message || "Could not launch coding environment. Please retry.");
            setStarting(false);
        }
    };

    const activeTopic = CODING_TOPICS.find(t => t.id === selectedTopicId) || CODING_TOPICS[0];

    return (
        <div style={{ maxWidth: "1216px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Header Breadcrumb */}
            <div>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: "6px"
                }}>
                    Coding Assessment · Problem Workspace
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Algorithmic Problemset Practice
                </h1>
                <p style={{ fontSize: "15px", color: "#475569", margin: 0 }}>
                    Solve authentic programming challenges imported from Codeforces. Choose your topics and run test cases in our proctored coding sandbox.
                </p>
            </div>

            {/* Main 2-Column Setup Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "28px", alignItems: "start" }}>
                {/* Left Column: Filter and Problem Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Filter Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
                            Filter Problemset
                        </h2>

                        {/* Topics Filter Buttons */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
                                Programming Topic
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {CODING_TOPICS.map(topic => {
                                    const isSelected = selectedTopicId === topic.id;
                                    return (
                                        <button
                                            key={topic.id}
                                            type="button"
                                            onClick={() => setSelectedTopicId(topic.id)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: isSelected ? "600" : "500",
                                                backgroundColor: isSelected ? "#0f172a" : "#f8fafc",
                                                color: isSelected ? "#ffffff" : "#475569",
                                                border: isSelected ? "1px solid #0f172a" : "1px solid #cbd5e1",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            {topic.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Split: Difficulty & Number of Questions */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
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
                                    <option value="all">All Difficulties</option>
                                    <option value="easy">Easy (800 - 1100 rating)</option>
                                    <option value="medium">Medium (1200 - 1500 rating)</option>
                                    <option value="hard">Hard (1600+ rating)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Number of Problems
                                </label>
                                <select
                                    value={problemCount}
                                    onChange={(e) => setProblemCount(Number(e.target.value))}
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        backgroundColor: "#ffffff"
                                    }}
                                >
                                    <option value={1}>1 Problem (Quick Session)</option>
                                    <option value={2}>2 Problems (Standard Round)</option>
                                    <option value={3}>3 Problems (Contest Simulation)</option>
                                    <option value={4}>4 Problems (Deep Practice)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Problem Selection List */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <div>
                                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 2px 0" }}>
                                    Matching Codeforces Problems ({problems.length})
                                </h2>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                    {selectedProblemIds.length} problem{selectedProblemIds.length === 1 ? "" : "s"} selected for this assessment
                                </div>
                            </div>
                            <span style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>
                                ✓ Verified Sample Cases
                            </span>
                        </div>

                        {loading ? (
                            <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                                ⏳ Fetching authentic Codeforces problems...
                            </div>
                        ) : problems.length === 0 ? (
                            <div style={{ padding: "28px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "8px", color: "#64748b", fontSize: "13px" }}>
                                No problems found matching this exact filter combination. Try selecting "All Topics" or "All Difficulties".
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {problems.map((prob) => {
                                    const isSelected = selectedProblemIds.includes(prob._id);
                                    const cid = prob.codingData?.contestId;
                                    const cidx = prob.codingData?.index;
                                    const codeforcesTag = cid && cidx ? `Codeforces ${cid}${cidx}` : "Codeforces";
                                    const sampleCount = prob.codingData?.samples?.length || 1;

                                    return (
                                        <div
                                            key={prob._id}
                                            onClick={() => toggleProblemSelection(prob._id)}
                                            style={{
                                                padding: "14px 16px",
                                                borderRadius: "10px",
                                                border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: "14px",
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                style={{ marginTop: "4px", cursor: "pointer" }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                                                    <span style={{
                                                        backgroundColor: "#dbeafe",
                                                        color: "#1e40af",
                                                        fontSize: "11px",
                                                        fontWeight: "700",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px"
                                                    }}>
                                                        {codeforcesTag}
                                                    </span>
                                                    <span style={{
                                                        backgroundColor: prob.difficulty === "easy" ? "#ecfdf5" : prob.difficulty === "hard" ? "#fef2f2" : "#fffbeb",
                                                        color: prob.difficulty === "easy" ? "#065f46" : prob.difficulty === "hard" ? "#991b1b" : "#92400e",
                                                        fontSize: "11px",
                                                        fontWeight: "600",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        textTransform: "capitalize"
                                                    }}>
                                                        {prob.difficulty}
                                                    </span>
                                                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                                                        {sampleCount} sample test case{sampleCount === 1 ? "" : "s"}
                                                    </span>
                                                </div>

                                                <p style={{
                                                    fontSize: "13px",
                                                    fontWeight: "600",
                                                    color: "#0f172a",
                                                    margin: "0 0 4px 0",
                                                    lineHeight: "1.4"
                                                }}>
                                                    {prob.questionText.slice(0, 110)}...
                                                </p>

                                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                                                    {(prob.keypoint || []).slice(0, 3).map((tag, idx) => (
                                                        <span key={idx} style={{
                                                            fontSize: "10px",
                                                            color: "#64748b",
                                                            backgroundColor: "#f1f5f9",
                                                            padding: "1px 6px",
                                                            borderRadius: "4px"
                                                        }}>
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Assessment Summary Card */}
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
                            READY TO CODE
                        </div>

                        <h3 style={{
                            fontSize: "20px",
                            fontWeight: "800",
                            color: "#0f172a",
                            margin: "0 0 18px 0"
                        }}>
                            Codeforces Assessment
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
                                <span style={{ color: "#64748b" }}>Problemset</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>Codeforces Archives</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Topic focus</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{activeTopic.label}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Selected problems</span>
                                <span style={{ fontWeight: "700", color: "#2563eb" }}>{selectedProblemIds.length}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Time allocation</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                    {selectedProblemIds.length === 1 ? "30 mins" : selectedProblemIds.length === 2 ? "45 mins" : "60 mins"}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Languages</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>JS, Python, C++, Java</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Execution</span>
                                <span style={{ fontWeight: "600", color: "#16a34a" }}>Judge0 Sandbox</span>
                            </div>
                        </div>

                        {error && (
                            <div style={{ fontSize: "12px", color: "#b91c1c", marginBottom: "16px" }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleStartCodingExam}
                            disabled={starting || selectedProblemIds.length === 0}
                            style={{
                                width: "100%",
                                backgroundColor: starting || selectedProblemIds.length === 0 ? "#94a3b8" : "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "700",
                                cursor: starting || selectedProblemIds.length === 0 ? "not-allowed" : "pointer",
                                marginBottom: "12px"
                            }}
                        >
                            {starting ? "Launching Coding Environment..." : `Start Coding Assessment (${selectedProblemIds.length} problems) →`}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/practice")}
                            style={{
                                width: "100%",
                                background: "none",
                                border: "none",
                                color: "#64748b",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer"
                            }}
                        >
                            ← Back to Practice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
