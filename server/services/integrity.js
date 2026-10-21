/**
 * Integrity Analysis Service
 * Evaluates candidate submission telemetry and textual patterns to detect:
 * 1. Paste / external injection attempts
 * 2. Keystroke-to-character ratio anomalies
 * 3. Implausibly fast typing speeds (duration vs answer length)
 * 4. Suspicious text patterns (markdown headings, AI bullet templates in plain text)
 * 5. High overlap / similarity with ideal answers or verbatim model outputs
 *
 * NOTE: Layered detection flags suspicious activity for manual review with evidence.
 * It does not auto-zero scores.
 */

// Tunable detection thresholds
const THRESHOLDS = {
    MIN_KEYSTROKE_RATIO: 0.5,         // Below 0.5 keystrokes per char is suspicious
    MAX_CPS: 20,                       // >20 characters per second typed is inhuman (~1200 wpm)
    MIN_TYPING_TIME_MS: 3000,          // Answers >= 80 chars typed in < 3s get flagged
    LARGE_INSERT_THRESHOLD: 80,        // Single insert > 80 chars without keystrokes
    SUSPICIOUS_MARKDOWN_COUNT: 2,      // Multiple markdown headers or structured bullets
    HIGH_SIMILARITY_THRESHOLD: 0.88    // Jaccard word similarity with ideal answer
};

/**
 * Tokenizes text into lowercase word tokens, stripping punctuation.
 */
function tokenizeWords(text) {
    if (!text || typeof text !== "string") return [];
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2);
}

/**
 * Computes Jaccard word similarity between two texts (0.0 to 1.0).
 */
function calculateWordOverlap(textA, textB) {
    const tokensA = new Set(tokenizeWords(textA));
    const tokensB = new Set(tokenizeWords(textB));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersectionCount = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) {
            intersectionCount++;
        }
    }
    const unionCount = new Set([...tokensA, ...tokensB]).size;
    return unionCount === 0 ? 0 : Number((intersectionCount / unionCount).toFixed(3));
}

/**
 * Detects suspicious AI formatting patterns in plain text:
 * - Markdown headings (###, ##)
 * - Numbered bullet lists like "1. **Title**:"
 * - Boilerplate phrases like "in conclusion", "furthermore, it is important to note"
 */
function detectSuspiciousPatterns(text) {
    if (!text || typeof text !== "string") return { detected: false, matches: [] };

    const matches = [];
    
    // Markdown headings
    if (/(^|\n)#{1,4}\s+[A-Za-z]/.test(text)) {
        matches.push("Contains markdown heading formatting (###)");
    }

    // Bold title lists often produced by LLMs: "1. **Concept**:" or "- **Key Point**:"
    if (/(^|\n)\s*(\d+\.|\-|\*)\s*\*\*[^*]+\*\*:/.test(text)) {
        matches.push("Structured bold bullet formatting common in LLM generation");
    }

    // AI boilerplate introductory / concluding phrases
    const aiClichés = [
        /as an ai/i,
        /in conclusion,\s+it is crucial/i,
        /it is important to note that/i,
        /to summarize the key takeaways/i,
        /delve into/i
    ];

    for (const rx of aiClichés) {
        if (rx.test(text)) {
            matches.push(`Contains AI boilerplate phrase (${rx.source})`);
        }
    }

    return {
        detected: matches.length > 0,
        matches
    };
}

/**
 * Computes an integrity report for a single answer.
 *
 * @param {Object} params
 * @param {string} params.answer - Candidate's submitted answer text/code
 * @param {string} [params.idealAnswer] - Ideal answer for similarity check
 * @param {Object} [params.telemetry] - Client keystroke telemetry
 * @returns {Object} Integrity report { riskLevel, reasons, flags, details }
 */
function computeAnswerIntegrity({ answer = "", userAnswer = "", idealAnswer = "", telemetry = {} }) {
    const text = (userAnswer || answer || "").trim();
    const length = text.length;
    const reasons = [];
    const flags = {
        pasteDetected: false,
        lowKeystrokeRatio: false,
        fastTypingSpeed: false,
        suspiciousPatterns: false,
        highIdealSimilarity: false
    };

    const pasteAttempts = telemetry.pasteAttempts || 0;
    const keystrokesCount = telemetry.keystrokesCount || 0;
    const largestInsertLength = telemetry.largestInsertLength || 0;
    const typingDurationMs = telemetry.typingDurationMs || 0;

    // 1. Direct paste detection & large text chunk insertion
    if (pasteAttempts > 0) {
        flags.pasteDetected = true;
        reasons.push(`${pasteAttempts} paste attempt(s) intercepted in answer box`);
    }

    if (largestInsertLength >= THRESHOLDS.LARGE_INSERT_THRESHOLD) {
        flags.pasteDetected = true;
        reasons.push(`Single text insert of ${largestInsertLength} characters detected without corresponding keystrokes`);
    }

    // 2. Keystroke-to-character ratio (only meaningful if answer has length)
    let keystrokeRatio = 1.0;
    if (length > 40) {
        keystrokeRatio = keystrokesCount / length;
        if (keystrokeRatio < THRESHOLDS.MIN_KEYSTROKE_RATIO && largestInsertLength > 40) {
            flags.lowKeystrokeRatio = true;
            reasons.push(`Low keystroke-to-character ratio (${keystrokeRatio.toFixed(2)} keystrokes/char; expected ≥ ${THRESHOLDS.MIN_KEYSTROKE_RATIO})`);
        }
    }

    // 3. Typing duration vs length (Characters Per Second)
    let charsPerSecond = 0;
    if (length > 60 && typingDurationMs > 0) {
        charsPerSecond = (length / (typingDurationMs / 1000));
        if (charsPerSecond > THRESHOLDS.MAX_CPS || (typingDurationMs < THRESHOLDS.MIN_TYPING_TIME_MS && length > 80)) {
            flags.fastTypingSpeed = true;
            reasons.push(`Implausibly fast input speed (~${Math.round(charsPerSecond * 60 / 5)} WPM / ${charsPerSecond.toFixed(1)} chars/sec)`);
        }
    }

    // 4. Suspicious text formatting patterns
    const patternAnalysis = detectSuspiciousPatterns(text);
    if (patternAnalysis.detected) {
        flags.suspiciousPatterns = true;
        reasons.push(...patternAnalysis.matches);
    }

    // 5. Similarity with ideal answer
    let similarity = 0;
    if (idealAnswer && idealAnswer.length > 50 && length > 50) {
        similarity = calculateWordOverlap(text, idealAnswer);
        if (similarity >= THRESHOLDS.HIGH_SIMILARITY_THRESHOLD) {
            flags.highIdealSimilarity = true;
            reasons.push(`High textual similarity (${Math.round(similarity * 100)}%) with system ideal answer`);
        }
    }

    // Risk level calculation
    let riskLevel = "low";
    const flagCount = Object.values(flags).filter(Boolean).length;

    if (flagCount >= 2 || (flags.pasteDetected && largestInsertLength >= 120)) {
        riskLevel = "high";
    } else if (flagCount === 1) {
        riskLevel = "medium";
    }

    return {
        riskLevel,
        reasons,
        flags,
        details: {
            answerLength: length,
            pasteAttempts,
            keystrokesCount,
            keystrokeRatio: Number(keystrokeRatio.toFixed(2)),
            largestInsertLength,
            typingDurationMs,
            charsPerSecond: Number(charsPerSecond.toFixed(1)),
            similarity
        }
    };
}

module.exports = {
    THRESHOLDS,
    tokenizeWords,
    calculateWordOverlap,
    calculateJaccardSimilarity: calculateWordOverlap,
    detectSuspiciousPatterns,
    detectMarkdownOrBulletBoilerplate: (text) => {
        const res = detectSuspiciousPatterns(text);
        return { hasArtifacts: res.detected, details: res.matches };
    },
    computeAnswerIntegrity
};
