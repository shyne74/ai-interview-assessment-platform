/**
 * Canonical Role & Domain Taxonomy Configuration for Client
 * Synchronized with server/config/taxonomy.js
 */

export const ROLES = [
    "Backend Developer",
    "Frontend Developer",
    "Full Stack Developer",
    "Software Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "AI/ML Engineer",
    "System Architect",
    "Philosophy",
    "Psychology"
];

export const ROLE_DOMAINS = {
    "Backend Developer": [
        "Node.js & Express",
        "Databases & Storage",
        "API Design & Microservices",
        "Backend Architecture"
    ],
    "Frontend Developer": [
        "React",
        "JavaScript & HTML/CSS",
        "UI State & Performance",
        "Web Accessibility"
    ],
    "Full Stack Developer": [
        "React & Node.js",
        "Full Stack Architecture",
        "Web Security & Auth",
        "REST & GraphQL APIs"
    ],
    "Software Engineer": [
        "Algorithms",
        "Data Structures",
        "Python",
        "Object-Oriented Design",
        "System Programming"
    ],
    "DevOps Engineer": [
        "CI/CD Pipelines",
        "Docker & Kubernetes",
        "Infrastructure as Code",
        "Monitoring & Observability"
    ],
    "Cloud Engineer": [
        "Cloud Architecture",
        "Serverless & Compute",
        "Cloud Networking & Security",
        "Cloud Storage & CDN"
    ],
    "AI/ML Engineer": [
        "Generative AI",
        "Machine Learning",
        "Deep Learning & Neural Nets",
        "LLM Architectures & Embeddings"
    ],
    "System Architect": [
        "Distributed Systems",
        "High Availability & Scalability",
        "Caching & Message Queues",
        "Enterprise Architecture"
    ],
    "Philosophy": [
        "Ancient Greek Philosophy",
        "Epistemology & Empiricism",
        "Metaphysics & Theology",
        "Philosophy of Language & Semantics",
        "Political Philosophy & Ethics"
    ],
    "Psychology": [
        "Cognitive Psychology",
        "Behavioral Psychology",
        "Developmental Psychology",
        "Neuropsychology"
    ]
};

const ROLE_ALIASES = {
    "backend developer": "Backend Developer",
    "backend engineer": "Backend Developer",
    "backend dev": "Backend Developer",
    "backend": "Backend Developer",
    "frontend developer": "Frontend Developer",
    "frontend engineer": "Frontend Developer",
    "frontend dev": "Frontend Developer",
    "junior web developer": "Frontend Developer",
    "web developer": "Frontend Developer",
    "frontend": "Frontend Developer",
    "full stack developer": "Full Stack Developer",
    "fullstack developer": "Full Stack Developer",
    "full stack engineer": "Full Stack Developer",
    "fullstack engineer": "Full Stack Developer",
    "full stack dev": "Full Stack Developer",
    "full stack": "Full Stack Developer",
    "software developer": "Software Engineer",
    "software develope": "Software Engineer",
    "software engineer": "Software Engineer",
    "swe": "Software Engineer",
    "coding": "Software Engineer",
    "devops engineer": "DevOps Engineer",
    "devops": "DevOps Engineer",
    "support engineer": "DevOps Engineer",
    "it support": "DevOps Engineer",
    "cloud engineer": "Cloud Engineer",
    "cloud": "Cloud Engineer",
    "ai/ml engineer": "AI/ML Engineer",
    "ai engineer": "AI/ML Engineer",
    "ml engineer": "AI/ML Engineer",
    "machine learning engineer": "AI/ML Engineer",
    "system architect": "System Architect",
    "solutions architect": "System Architect",
    "solution architect": "System Architect",
    "philosophy": "Philosophy",
    "psychology": "Psychology",
    "unknown": "Software Engineer"
};

const DOMAIN_ALIASES = {
    "node": "Node.js & Express",
    "nodejs": "Node.js & Express",
    "node.js": "Node.js & Express",
    "express": "Node.js & Express",
    "expressjs": "Node.js & Express",
    "express.js": "Node.js & Express",
    "node.js & mongodb": "Node.js & Express",
    "database": "Databases & Storage",
    "databases": "Databases & Storage",
    "mongodb": "Databases & Storage",
    "sql": "Databases & Storage",
    "system design & microservices": "API Design & Microservices",
    "api design": "API Design & Microservices",
    "backend architecture": "Backend Architecture",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "javascript": "JavaScript & HTML/CSS",
    "javascript & html/css": "JavaScript & HTML/CSS",
    "html": "JavaScript & HTML/CSS",
    "css": "JavaScript & HTML/CSS",
    "ui state": "UI State & Performance",
    "react & node.js": "React & Node.js",
    "full stack orchestration": "Full Stack Architecture",
    "web security": "Web Security & Auth",
    "algorithm": "Algorithms",
    "algorithms": "Algorithms",
    "algorithms (112)": "Algorithms",
    "data structures": "Data Structures",
    "document analysis": "System Programming",
    "python": "Python",
    "ci/cd": "CI/CD Pipelines",
    "ci/cd pipelines": "CI/CD Pipelines",
    "docker & kubernetes": "Docker & Kubernetes",
    "docker": "Docker & Kubernetes",
    "kubernetes": "Docker & Kubernetes",
    "support engineering": "Monitoring & Observability",
    "generative ai": "Generative AI",
    "genai": "Generative AI",
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning & Neural Nets",
    "epistemology & empiricism (1)": "Epistemology & Empiricism",
    "epistemology & empiricism": "Epistemology & Empiricism",
    "epistemology": "Epistemology & Empiricism",
    "ancient greek philosophy": "Ancient Greek Philosophy",
    "metaphysics & theology": "Metaphysics & Theology",
    "philosophy of language & semantics": "Philosophy of Language & Semantics",
    "political philosophy & natural rights": "Political Philosophy & Ethics"
};

export function canonicalRole(r) {
    if (!r || typeof r !== "string") return "Software Engineer";
    const cleaned = r.trim().toLowerCase().replace(/\s+/g, " ");
    if (ROLE_ALIASES[cleaned]) {
        return ROLE_ALIASES[cleaned];
    }
    const exact = ROLES.find(role => role.toLowerCase() === cleaned);
    if (exact) return exact;

    for (const [alias, canonical] of Object.entries(ROLE_ALIASES)) {
        if (cleaned.includes(alias)) {
            return canonical;
        }
    }
    return "Software Engineer";
}

export function canonicalDomain(rawDomain, questionText = "", role = "") {
    const effectiveRole = canonicalRole(role);
    const validDomains = ROLE_DOMAINS[effectiveRole] || ROLE_DOMAINS["Software Engineer"];

    if (!rawDomain || typeof rawDomain !== "string") {
        return validDomains[0];
    }

    let d = rawDomain.trim().toLowerCase().replace(/\s*\(\d+\)/g, "").trim();

    if (DOMAIN_ALIASES[d]) {
        const candidate = DOMAIN_ALIASES[d];
        if (validDomains.includes(candidate)) return candidate;
    }

    if (effectiveRole === "Philosophy" || d.includes(",") || d.includes("philosophy")) {
        const text = (questionText + " " + d).toLowerCase();
        if (text.includes("putnam") || text.includes("twin earth") || text.includes("semantic") || text.includes("language and meaning")) {
            return "Philosophy of Language & Semantics";
        }
        if (text.includes("aquinas") || text.includes("five ways") || text.includes("scholasticism") || text.includes("theology") || text.includes("god")) {
            return "Metaphysics & Theology";
        }
        if (text.includes("natural rights") || text.includes("two treatises") || text.includes("state of nature") || text.includes("political") || text.includes("ethics")) {
            return "Political Philosophy & Ethics";
        }
        if (text.includes("locke") || text.includes("tabula rasa") || text.includes("empiric") || text.includes("epistemology") || text.includes("innate")) {
            return "Epistemology & Empiricism";
        }
        if (text.includes("plato") || text.includes("aristotle") || text.includes("socrates") || text.includes("cave") || text.includes("forms") || text.includes("greek")) {
            return "Ancient Greek Philosophy";
        }
    }

    if (d.includes(",")) {
        const parts = d.split(",").map(p => p.trim());
        for (const part of parts) {
            if (DOMAIN_ALIASES[part] && validDomains.includes(DOMAIN_ALIASES[part])) {
                return DOMAIN_ALIASES[part];
            }
        }
    }

    for (const valid of validDomains) {
        if (d.includes(valid.toLowerCase()) || valid.toLowerCase().includes(d)) {
            return valid;
        }
    }

    return validDomains[0];
}
