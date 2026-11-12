const Question = require("../models/question_schema");
const Interview = require("../models/interview_schema");

// Canonical Roles & Engineering Domains
const TAXONOMY_ROLES = [
    { title: "Backend Developer", category: "Web Engineering", description: "Node.js, Express, REST APIs, SQL/NoSQL databases, caching, concurrency", keywords: ["backend", "server", "api", "node", "database", "sql"] },
    { title: "Frontend Developer", category: "Web Engineering", description: "React, modern JavaScript, TypeScript, UI state, CSS, accessibility", keywords: ["frontend", "react", "ui", "client", "web", "css", "javascript"] },
    { title: "Full Stack Developer", category: "Web Engineering", description: "End-to-end web architecture, React, Node.js, REST APIs, and database migrations", keywords: ["full stack", "fullstack", "frontend", "backend", "web"] },
    { title: "Software Engineer", category: "Core Computer Science", description: "Data structures, algorithms, system architecture, OOP, clean code", keywords: ["software", "algorithms", "dsa", "coding", "computer science"] },
    { title: "System Architect", category: "Core Computer Science", description: "Distributed systems, scalability, message queues, microservices, reliability", keywords: ["system", "architect", "distributed", "scalability", "microservices", "backend"] },
    { title: "DevOps Engineer", category: "Cloud & Infrastructure", description: "Docker, Kubernetes, CI/CD pipelines, Terraform, Linux automation", keywords: ["devops", "docker", "kubernetes", "ci/cd", "infrastructure", "linux"] },
    { title: "Cloud Engineer", category: "Cloud & Infrastructure", description: "AWS, GCP, Azure, serverless compute, cloud networking, IAM security", keywords: ["cloud", "aws", "gcp", "azure", "serverless", "infrastructure"] },
    { title: "AI/ML Engineer", category: "AI & Emerging Tech", description: "Machine learning, neural networks, LLMs, RAG, vector databases, embeddings", keywords: ["ai", "ml", "machine learning", "deep learning", "llm", "rag", "data science"] },
    { title: "Data Engineer", category: "AI & Emerging Tech", description: "Data pipelines, ETL, Apache Spark, BigQuery, data modeling, streaming", keywords: ["data", "etl", "spark", "bigquery", "pipelines", "streaming"] },
    { title: "Mobile Developer", category: "Web Engineering", description: "React Native, Flutter, iOS, Android, mobile UI state and performance", keywords: ["mobile", "react native", "android", "ios", "flutter"] },
    { title: "Security Engineer", category: "Security & Operations", description: "Application security, OWASP, cryptography, vulnerability auditing, OAuth2", keywords: ["security", "owasp", "auth", "cryptography", "cybersecurity"] }
];

// Technical Skills & Frameworks
const TAXONOMY_SKILLS = [
    { skill: "Node.js", role: "Backend Developer", tags: ["backend", "server", "javascript", "v8", "runtime", "async"] },
    { skill: "Express.js", role: "Backend Developer", tags: ["backend", "rest", "api", "routing", "middleware", "server"] },
    { skill: "REST APIs", role: "Backend Developer", tags: ["backend", "api", "http", "endpoints", "json", "restful"] },
    { skill: "SQL", role: "Backend Developer", tags: ["backend", "database", "relational", "postgres", "mysql", "queries", "acid"] },
    { skill: "MongoDB", role: "Backend Developer", tags: ["backend", "database", "nosql", "aggregation", "documents"] },
    { skill: "Redis & Caching", role: "Backend Developer", tags: ["backend", "caching", "in-memory", "performance", "redis", "ttl"] },
    { skill: "Database Design", role: "Backend Developer", tags: ["backend", "database", "schema", "indexing", "normalization"] },
    { skill: "React", role: "Frontend Developer", tags: ["frontend", "ui", "components", "hooks", "virtual dom", "web"] },
    { skill: "JavaScript", role: "Frontend Developer", tags: ["frontend", "web", "es6", "async", "dom", "browser"] },
    { skill: "TypeScript", role: "Frontend Developer", tags: ["frontend", "types", "interfaces", "generics", "fullstack"] },
    { skill: "Next.js", role: "Frontend Developer", tags: ["frontend", "react", "ssr", "ssg", "fullstack", "web"] },
    { skill: "CSS & Responsive Design", role: "Frontend Developer", tags: ["frontend", "css", "html", "flexbox", "grid", "styling"] },
    { skill: "Docker & Containers", role: "DevOps Engineer", tags: ["devops", "containers", "dockerfile", "images", "infrastructure"] },
    { skill: "Kubernetes", role: "DevOps Engineer", tags: ["devops", "k8s", "pods", "deployments", "orchestration", "cloud"] },
    { skill: "Terraform", role: "DevOps Engineer", tags: ["devops", "iac", "cloud", "infrastructure", "automation"] },
    { skill: "AWS Infrastructure", role: "Cloud Engineer", tags: ["cloud", "aws", "s3", "ec2", "iam", "serverless"] },
    { skill: "Machine Learning Foundations", role: "AI/ML Engineer", tags: ["ai", "ml", "regression", "classification", "clustering"] },
    { skill: "Generative AI & LLMs", role: "AI/ML Engineer", tags: ["ai", "ml", "llm", "rag", "transformers", "prompts", "vector"] },
    { skill: "Data Structures & Algorithms", role: "Software Engineer", tags: ["algorithms", "dsa", "coding", "trees", "graphs", "complexity"] },
    { skill: "Dynamic Programming", role: "Software Engineer", tags: ["algorithms", "dsa", "dp", "memoization", "optimization"] },
    { skill: "Message Queues & Kafka", role: "System Architect", tags: ["backend", "messaging", "kafka", "rabbitmq", "pubsub", "streaming"] },
    { skill: "Distributed Systems Design", role: "System Architect", tags: ["architecture", "scalability", "microservices", "latency", "backend"] }
];

// Curated Topics
const TAXONOMY_TOPICS = [
    { topic: "Authentication & Authorization", role: "Backend Developer", tags: ["backend", "jwt", "oauth", "security", "sessions", "rbac"] },
    { topic: "API Design & Idempotency", role: "Backend Developer", tags: ["backend", "rest", "api", "http", "idempotency", "endpoints"] },
    { topic: "Server-side Development", role: "Backend Developer", tags: ["backend", "server", "node", "concurrency", "performance"] },
    { topic: "Database Management & Indexing", role: "Backend Developer", tags: ["backend", "database", "sql", "postgres", "indexing", "queries"] },
    { topic: "Microservices & Caching Architecture", role: "Backend Developer", tags: ["backend", "redis", "caching", "microservices", "distributed"] },
    { topic: "State Management & Context", role: "Frontend Developer", tags: ["frontend", "react", "redux", "state", "context", "zustand"] },
    { topic: "Component Lifecycle & Hooks", role: "Frontend Developer", tags: ["frontend", "react", "hooks", "lifecycle", "rendering"] },
    { topic: "Web Accessibility (WCAG)", role: "Frontend Developer", tags: ["frontend", "a11y", "wcag", "aria", "accessibility"] },
    { topic: "Performance Optimization & Core Web Vitals", role: "Frontend Developer", tags: ["frontend", "web", "performance", "lighthouse", "bundle"] },
    { topic: "RAG & Vector Search", role: "AI/ML Engineer", tags: ["ai", "ml", "rag", "vector", "embeddings", "retrieval", "llm"] },
    { topic: "Model Evaluation & Metrics", role: "AI/ML Engineer", tags: ["ai", "ml", "evaluation", "metrics", "loss", "accuracy"] },
    { topic: "Binary Trees & Graph Traversals", role: "Software Engineer", tags: ["dsa", "algorithms", "trees", "graphs", "bfs", "dfs", "coding"] },
    { topic: "Recursion & Backtracking", role: "Software Engineer", tags: ["dsa", "algorithms", "recursion", "backtracking", "coding"] },
    { topic: "CI/CD Pipeline Automation", role: "DevOps Engineer", tags: ["devops", "ci/cd", "github actions", "automation", "builds"] },
    { topic: "Zero-Trust Security & IAM", role: "Security Engineer", tags: ["security", "iam", "cloud", "aws", "zero-trust", "policies"] }
];

function scoreItem(title, tags, category, query) {
    const lowerTitle = (title || "").toLowerCase();
    const lowerQ = query.toLowerCase();

    if (lowerTitle === lowerQ) return 100;
    if (lowerTitle.startsWith(lowerQ)) return 85;
    if (lowerTitle.includes(` ${lowerQ}`)) return 75;
    if (lowerTitle.includes(lowerQ)) return 60;

    // Word boundary or token match
    const words = lowerTitle.split(/[\s,&/]+/);
    if (words.some(w => w === lowerQ)) return 70;

    // Tag / category match
    if (Array.isArray(tags)) {
        if (tags.some(t => t.toLowerCase() === lowerQ)) return 55;
        if (tags.some(t => t.toLowerCase().includes(lowerQ) || lowerQ.includes(t.toLowerCase()))) return 45;
    }
    if (category && category.toLowerCase().includes(lowerQ)) return 40;

    return 0;
}

exports.globalSearch = async function(req, res) {
    try {
        const query = (req.query.q || "").trim();
        if (!query || query.length < 2) {
            return res.status(200).json({
                roles: [],
                skills: [],
                topics: [],
                codingProblems: [],
                pastAssessments: []
            });
        }

        const lowerQ = query.toLowerCase();
        const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedQ, "i");

        // 1. Roles & Domains
        const matchedRoles = [];
        TAXONOMY_ROLES.forEach(r => {
            const score = scoreItem(r.title, r.keywords, r.category, query);
            if (score > 0) {
                matchedRoles.push({
                    title: r.title,
                    category: r.category,
                    description: r.description,
                    type: "Role / Track",
                    relevance: score,
                    url: `/practice/one-skill?domain=${encodeURIComponent(r.title)}`
                });
            }
        });
        matchedRoles.sort((a, b) => b.relevance - a.relevance);

        // 2. Skills & Technologies
        const matchedSkills = [];
        TAXONOMY_SKILLS.forEach(s => {
            const score = scoreItem(s.skill, s.tags, s.role, query);
            if (score > 0) {
                matchedSkills.push({
                    skill: s.skill,
                    role: s.role,
                    type: "Technical Skill",
                    relevance: score,
                    url: `/practice/one-skill?domain=${encodeURIComponent(s.role)}&skill=${encodeURIComponent(s.skill)}`
                });
            }
        });
        matchedSkills.sort((a, b) => b.relevance - a.relevance);

        // 3. Topics
        const matchedTopics = [];
        TAXONOMY_TOPICS.forEach(t => {
            const score = scoreItem(t.topic, t.tags, t.role, query);
            if (score > 0) {
                matchedTopics.push({
                    topic: t.topic,
                    role: t.role,
                    type: "Curriculum Topic",
                    relevance: score,
                    url: `/practice/one-skill?domain=${encodeURIComponent(t.role)}&skill=${encodeURIComponent(t.topic)}`
                });
            }
        });
        matchedTopics.sort((a, b) => b.relevance - a.relevance);

        // 4. Coding Problems
        const codingProblems = await Question.find({
            assessmentType: "coding",
            $or: [
                { questionText: regex },
                { keypoint: regex },
                { domain: regex },
                { "codingData.problemUrl": regex }
            ]
        })
        .select("_id questionText difficulty keypoint codingData domain")
        .limit(6);

        const formattedCoding = codingProblems.map(cp => {
            const contestId = cp.codingData?.contestId;
            const index = cp.codingData?.index;
            let title = cp.questionText.trim();
            title = title.replace(/^#+\s*/, "").split("\n")[0];
            if (title.length > 55) title = title.slice(0, 52) + "...";

            const label = contestId && index
                ? `CF ${contestId}${index} — ${title}`
                : title;

            return {
                id: cp._id,
                title: label,
                difficulty: cp.difficulty || "medium",
                tags: cp.keypoint || [cp.domain || "Algorithms"],
                type: "Coding Challenge",
                url: `/practice/coding-setup?problemId=${cp._id}`
            };
        });

        // 5. Past Assessments (User-specific if logged in)
        let pastAssessments = [];
        if (req.user && req.user._id) {
            const userInterviews = await Interview.find({
                candidateId: req.user._id,
                status: { $in: ["evaluated", "completed"] },
                $or: [
                    { roleTitle: regex },
                    { domain: regex }
                ]
            })
            .select("_id roleTitle domain overallScore createdAt status")
            .sort({ createdAt: -1 })
            .limit(4);

            pastAssessments = userInterviews.map(ui => ({
                id: ui._id,
                title: `${ui.roleTitle} (Score: ${ui.overallScore || 0}/10)`,
                subtitle: ui.domain || "Standard Assessment",
                type: "Past Assessment",
                url: `/results/${ui._id}`
            }));
        }

        return res.status(200).json({
            roles: matchedRoles.slice(0, 4),
            skills: matchedSkills.slice(0, 8),
            topics: matchedTopics.slice(0, 6),
            codingProblems: formattedCoding,
            pastAssessments
        });
    } catch (err) {
        console.error("Search error:", err);
        return res.status(500).json({ message: "Search service encountered an error" });
    }
};
