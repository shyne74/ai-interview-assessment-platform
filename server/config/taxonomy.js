/**
 * Canonical Role & Domain Taxonomy Configuration
 * 
 * Defines the single authoritative hierarchy of:
 * 1. Fixed canonical roles
 * 2. Alias mapping for roles
 * 3. Controlled, non-overlapping domains per role (max 5-6 sub-domains per role)
 * 4. Alias mapping for domains
 */

const ROLES = [
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

// Alias mapping for roles: maps informal, case-variant, or duplicate roles to canonical names
const ROLE_ALIASES = {
    // Backend variations
    "backend developer": "Backend Developer",
    "backend engineer": "Backend Developer",
    "backend dev": "Backend Developer",
    "backend": "Backend Developer",

    // Frontend variations
    "frontend developer": "Frontend Developer",
    "frontend engineer": "Frontend Developer",
    "frontend dev": "Frontend Developer",
    "junior web developer": "Frontend Developer",
    "web developer": "Frontend Developer",
    "frontend": "Frontend Developer",

    // Full Stack variations
    "full stack developer": "Full Stack Developer",
    "fullstack developer": "Full Stack Developer",
    "full stack engineer": "Full Stack Developer",
    "fullstack engineer": "Full Stack Developer",
    "full stack dev": "Full Stack Developer",
    "full stack": "Full Stack Developer",

    // Software Engineer variations
    "software developer": "Software Engineer",
    "software develope": "Software Engineer",
    "software engineer": "Software Engineer",
    "swe": "Software Engineer",
    "coding": "Software Engineer", // "Coding" is a domain / assessment type, mapped to Software Engineer

    // DevOps variations
    "devops engineer": "DevOps Engineer",
    "devops": "DevOps Engineer",
    "support engineer": "DevOps Engineer",
    "it support": "DevOps Engineer",

    // Cloud variations
    "cloud engineer": "Cloud Engineer",
    "cloud": "Cloud Engineer",

    // AI/ML variations
    "ai/ml engineer": "AI/ML Engineer",
    "ai engineer": "AI/ML Engineer",
    "ml engineer": "AI/ML Engineer",
    "machine learning engineer": "AI/ML Engineer",

    // System Architect variations
    "system architect": "System Architect",
    "solutions architect": "System Architect",
    "solution architect": "System Architect",

    // Humanities
    "philosophy": "Philosophy",
    "psychology": "Psychology",

    "unknown": "Software Engineer"
};

/**
 * Controlled list of canonical domains per role (max 5-6 per role).
 * Every domain belongs to exactly one role.
 */
const ROLE_DOMAINS = {
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

// Alias and keyword mapping to map loose domain strings into the canonical domain for the role
const DOMAIN_ALIASES = {
    // Backend mappings
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

    // Frontend mappings
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "javascript": "JavaScript & HTML/CSS",
    "javascript & html/css": "JavaScript & HTML/CSS",
    "html": "JavaScript & HTML/CSS",
    "css": "JavaScript & HTML/CSS",
    "ui state": "UI State & Performance",

    // Full Stack mappings
    "react & node.js": "React & Node.js",
    "full stack orchestration": "Full Stack Architecture",
    "web security": "Web Security & Auth",

    // Software Engineer mappings
    "algorithm": "Algorithms",
    "algorithms": "Algorithms",
    "algorithms (112)": "Algorithms",
    "data structures": "Data Structures",
    "document analysis": "System Programming",
    "python": "Python",

    // DevOps mappings
    "ci/cd": "CI/CD Pipelines",
    "ci/cd pipelines": "CI/CD Pipelines",
    "docker & kubernetes": "Docker & Kubernetes",
    "docker": "Docker & Kubernetes",
    "kubernetes": "Docker & Kubernetes",
    "support engineering": "Monitoring & Observability",

    // AI/ML mappings
    "generative ai": "Generative AI",
    "genai": "Generative AI",
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning & Neural Nets",

    // Philosophy mappings
    "epistemology & empiricism (1)": "Epistemology & Empiricism",
    "epistemology & empiricism": "Epistemology & Empiricism",
    "epistemology": "Epistemology & Empiricism",
    "ancient greek philosophy": "Ancient Greek Philosophy",
    "metaphysics & theology": "Metaphysics & Theology",
    "philosophy of language & semantics": "Philosophy of Language & Semantics",
    "political philosophy & natural rights": "Political Philosophy & Ethics"
};

/**
 * Normalizes any role string into a canonical role.
 */
function canonicalRole(r) {
    if (!r || typeof r !== "string") return "Software Engineer";
    const cleaned = r.trim().toLowerCase().replace(/\s+/g, " ");
    if (ROLE_ALIASES[cleaned]) {
        return ROLE_ALIASES[cleaned];
    }

    // Direct match against ROLES
    const exact = ROLES.find(role => role.toLowerCase() === cleaned);
    if (exact) return exact;

    // Check partial containment
    for (const [alias, canonical] of Object.entries(ROLE_ALIASES)) {
        if (cleaned.includes(alias)) {
            return canonical;
        }
    }

    return "Software Engineer";
}

/**
 * Normalizes any domain into a canonical domain for the given canonical role.
 * Multi-topic comma strings are analyzed and resolved to a single controlled domain.
 */
function canonicalDomain(rawDomain, questionText = "", role = "") {
    const effectiveRole = canonicalRole(role);
    const validDomains = ROLE_DOMAINS[effectiveRole] || ROLE_DOMAINS["Software Engineer"];

    if (!rawDomain || typeof rawDomain !== "string") {
        return validDomains[0];
    }

    let d = rawDomain.trim().toLowerCase();

    // Remove single-question parenthetical numbers like "Database (1)"
    d = d.replace(/\s*\(\d+\)/g, "").trim();

    // Check direct alias mapping
    if (DOMAIN_ALIASES[d]) {
        const candidate = DOMAIN_ALIASES[d];
        if (validDomains.includes(candidate)) return candidate;
    }

    // Philosophy semantic content inspection for multi-topic strings
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

    // If comma-separated, try each part
    if (d.includes(",")) {
        const parts = d.split(",").map(p => p.trim());
        for (const part of parts) {
            if (DOMAIN_ALIASES[part] && validDomains.includes(DOMAIN_ALIASES[part])) {
                return DOMAIN_ALIASES[part];
            }
        }
    }

    // Keyword matching across valid domains of this role
    for (const valid of validDomains) {
        if (d.includes(valid.toLowerCase()) || valid.toLowerCase().includes(d)) {
            return valid;
        }
    }

    // Misclassified check (e.g. React under DevOps)
    if (d.includes("react") && effectiveRole === "DevOps Engineer") {
        return "CI/CD Pipelines"; // Re-point misclassified question to valid DevOps domain
    }

    // Fallback: Default to first valid domain of the canonical role
    return validDomains[0];
}

/**
 * Validates whether a role and domain pair conforms to the taxonomy.
 */
function isValidTaxonomy(role, domain) {
    if (!ROLES.includes(role)) return false;
    const allowed = ROLE_DOMAINS[role];
    return Array.isArray(allowed) && allowed.includes(domain);
}

module.exports = {
    ROLES,
    ROLE_ALIASES,
    ROLE_DOMAINS,
    DOMAIN_ALIASES,
    canonicalRole,
    canonicalDomain,
    isValidTaxonomy
};
