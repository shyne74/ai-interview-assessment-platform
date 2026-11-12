/**
 * Integrity & Plagiarism Analysis Service
 * Evaluates candidate submission telemetry and textual/code patterns to detect:
 * 1. Plagiarism & Verbatim Match (Ideal Answer, Web / Canonical Solutions)
 * 2. External Copy-Paste Injection (telemetry & chunk anomalies)
 * 3. Keystroke-to-character ratio anomalies & typing speed impossibilities
 * 4. AI / LLM formatting signatures (markdown headers, bold bullets, cliché boilerplate)
 * 5. Cross-answer repetitive plagiarism
 */

// Tunable detection thresholds
const THRESHOLDS = {
    MIN_KEYSTROKE_RATIO: 0.5,         // Below 0.5 keystrokes per char is suspicious
    MAX_CPS: 20,                       // >20 characters per second typed is inhuman (~1200 wpm)
    MIN_TYPING_TIME_MS: 3000,          // Answers >= 80 chars typed in < 3s get flagged
    LARGE_INSERT_THRESHOLD: 80,        // Single insert > 80 chars without keystrokes
    SUSPICIOUS_MARKDOWN_COUNT: 2,      // Multiple markdown headers or structured bullets
    HIGH_SIMILARITY_THRESHOLD: 0.88,   // Jaccard word similarity with ideal answer
    PLAGIARISM_HIGH_SIMILARITY: 0.70,  // Plagiarism trigger threshold
    PLAGIARISM_SUSPICIOUS_SIM: 0.45    // Suspicious overlap threshold
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
 * Tokenizes text into n-grams of words.
 */
function getWordNGrams(text, n = 3) {
    const words = tokenizeWords(text);
    const ngrams = new Set();
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.add(words.slice(i, i + n).join(" "));
    }
    return ngrams;
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
 * Computes n-gram overlap ratio between candidate text and reference text.
 */
function calculateNGramOverlap(candidate, reference, n = 3) {
    const cNgrams = getWordNGrams(candidate, n);
    const rNgrams = getWordNGrams(reference, n);
    if (cNgrams.size === 0 || rNgrams.size === 0) return 0;

    let matchCount = 0;
    for (const ng of cNgrams) {
        if (rNgrams.has(ng)) matchCount++;
    }
    return Number((matchCount / cNgrams.size).toFixed(3));
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
    
    // Markdown codeblocks inside submitted answer or code
    if (/\`\`\`[a-z]*\s*\n/i.test(text)) {
        matches.push("Contains pasted markdown code fences (\`\`\`)");
    }

    // AI generated code complexity, approach, or solution annotations
    if (/(\/\/|#|\/\*)\s*(time\s+complexity|space\s+complexity|approach\s*:|algorithm\s*:|optimal\s+solution)/i.test(text)) {
        matches.push("Contains AI-style complexity or approach annotations in comments");
    }

    // AI code boilerplate comments
    if (/(\/\/|#)\s*(example\s+usage|driver\s+code|test\s+case|helper\s+function\s+to|base\s+case\s*:)/i.test(text)) {
        matches.push("Contains AI boilerplate explanation comments");
    }

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
        /delve into/i,
        /certainly!? here is/i,
        /here is a comprehensive/i,
        /key takeaways?:/i,
        /it is worth mentioning/i,
        /testament to/i
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
 * Computes comprehensive Plagiarism analysis for an answer.
 * Checks:
 * - Ideal answer overlap & verbatim n-gram duplication
 * - Telemetry clipboard paste injection
 * - AI text generation signatures
 * - Unnatural input speed
 * - Cross-question duplication
 *
 * @param {Object} params
 * @param {string} params.answer - Submitted candidate text or code
 * @param {string} [params.idealAnswer] - Benchmark reference answer
 * @param {Object} [params.telemetry] - Keystroke and paste telemetry
 * @param {string} [params.questionType] - "theory" | "coding"
 * @param {Array<string>} [params.previousAnswers] - Other answers in same exam to detect self-copy
 * @returns {Object} Full Plagiarism Evaluation Report
 */
function evaluateAnswerPlagiarism({
    answer = "",
    idealAnswer = "",
    telemetry = {},
    questionType = "theory",
    previousAnswers = []
}) {
    const text = (answer || "").trim();
    const length = text.length;

    let plagiarismPoints = 0;
    const detectedSources = [];
    const flags = {
        highIdealSimilarity: false,
        verbatimPhraseMatch: false,
        clipboardPasteInjection: false,
        aiSignaturesDetected: false,
        inhumanTypingSpeed: false,
        crossAnswerDuplication: false
    };

    if (length < 20) {
        return {
            plagiarismScore: 0,
            originalityScore: 100,
            riskLevel: "low",
            status: "Clean",
            isPlagiarized: false,
            detectedSources: [],
            flags,
            similarityWithIdeal: 0,
            details: { answerLength: length, wordCount: 0 }
        };
    }

    // 1. Check Similarity with Reference / Ideal Answer
    let wordOverlap = 0;
    let nGramOverlap = 0;
    if (idealAnswer && idealAnswer.length > 30) {
        wordOverlap = calculateWordOverlap(text, idealAnswer);
        nGramOverlap = calculateNGramOverlap(text, idealAnswer, 3);

        if (wordOverlap >= THRESHOLDS.HIGH_SIMILARITY_THRESHOLD || nGramOverlap >= 0.70) {
            plagiarismPoints += 50;
            flags.highIdealSimilarity = true;
            flags.verbatimPhraseMatch = true;
            detectedSources.push(`Verbatim text match with reference solution (${Math.round(Math.max(wordOverlap, nGramOverlap) * 100)}% match)`);
        } else if (wordOverlap >= THRESHOLDS.PLAGIARISM_HIGH_SIMILARITY || nGramOverlap >= 0.45) {
            plagiarismPoints += 30;
            flags.highIdealSimilarity = true;
            detectedSources.push(`High conceptual & structural overlap with reference solution (${Math.round(wordOverlap * 100)}%)`);
        } else if (wordOverlap >= THRESHOLDS.PLAGIARISM_SUSPICIOUS_SIM) {
            plagiarismPoints += 15;
            detectedSources.push(`Moderate similarity with standard answer pattern (${Math.round(wordOverlap * 100)}%)`);
        }
    }

    // 2. Telemetry Clipboard Paste Detection
    const pasteAttempts = telemetry.pasteAttempts || 0;
    const largestInsertLength = telemetry.largestInsertLength || 0;
    const keystrokesCount = telemetry.keystrokesCount || 0;
    const typingDurationMs = telemetry.typingDurationMs || 0;

    if (pasteAttempts > 0 || largestInsertLength >= THRESHOLDS.LARGE_INSERT_THRESHOLD) {
        flags.clipboardPasteInjection = true;
        const pts = questionType === "coding"
            ? (largestInsertLength >= 120 ? 45 : (largestInsertLength >= 60 ? 35 : 20))
            : (largestInsertLength >= 200 ? 35 : (largestInsertLength >= 100 ? 25 : 15));
        plagiarismPoints += pts;
        detectedSources.push(`External clipboard insertion detected (${pasteAttempts} paste events, largest block: ${largestInsertLength} chars)`);
    }

    // 3. Keystroke to Character Ratio
    let keystrokeRatio = 1.0;
    if (length > 50) {
        keystrokeRatio = keystrokesCount / length;
        if (keystrokeRatio < 0.35 && largestInsertLength > 50) {
            plagiarismPoints += 20;
            detectedSources.push(`Abnormally low keystroke ratio (${keystrokeRatio.toFixed(2)} keys/char; text arrived externally)`);
        }
    }

    // 4. Inhuman Typing Speed
    let charsPerSec = 0;
    if (length > 80 && typingDurationMs > 0) {
        charsPerSec = length / (typingDurationMs / 1000);
        if (charsPerSec > THRESHOLDS.MAX_CPS || (typingDurationMs < THRESHOLDS.MIN_TYPING_TIME_MS && length > 120)) {
            flags.inhumanTypingSpeed = true;
            plagiarismPoints += 20;
            detectedSources.push(`Unnatural text injection speed (${Math.round(charsPerSec * 60 / 5)} WPM / ${charsPerSec.toFixed(1)} chars/sec)`);
        }
    }

    // 5. AI LLM Text Signatures (Markdown headers, bold bullet lists, boilerplate phrases)
    const patternAnalysis = detectSuspiciousPatterns(text);
    if (patternAnalysis.detected) {
        flags.aiSignaturesDetected = true;
        plagiarismPoints += 25;
        detectedSources.push(...patternAnalysis.matches);
    }

    // 6. Cross-Answer Duplicate Check
    if (Array.isArray(previousAnswers) && previousAnswers.length > 0) {
        for (const prev of previousAnswers) {
            if (prev && prev.length > 40) {
                const selfSim = calculateWordOverlap(text, prev);
                if (selfSim > 0.85) {
                    flags.crossAnswerDuplication = true;
                    plagiarismPoints += 30;
                    detectedSources.push("Repetitive duplicate answer submitted across multiple questions");
                    break;
                }
            }
        }
    }

    // Bound plagiarism score to 0 - 100%
    const finalPlagiarismScore = Math.min(100, Math.max(0, plagiarismPoints));
    const originalityScore = 100 - finalPlagiarismScore;

    let riskLevel = "low";
    let status = "Clean";
    if (finalPlagiarismScore >= 60) {
        riskLevel = "high";
        status = "Flagged (High Risk)";
    } else if (finalPlagiarismScore >= 35) {
        riskLevel = "medium";
        status = "Suspicious (Moderate)";
    } else if (finalPlagiarismScore >= 15) {
        riskLevel = "low";
        status = "Low Risk";
    }

    return {
        plagiarismScore: finalPlagiarismScore,
        originalityScore,
        riskLevel,
        status,
        isPlagiarized: finalPlagiarismScore >= 50,
        detectedSources,
        flags,
        similarityWithIdeal: Math.round(wordOverlap * 100),
        details: {
            answerLength: length,
            wordCount: tokenizeWords(text).length,
            pasteAttempts,
            largestInsertLength,
            keystrokeRatio: Number(keystrokeRatio.toFixed(2)),
            charsPerSec: Number(charsPerSec.toFixed(1))
        }
    };
}

/**
 * Computes an integrity report for a single answer (preserves backward compatibility).
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
    calculateNGramOverlap,
    detectSuspiciousPatterns,
    detectMarkdownOrBulletBoilerplate: (text) => {
        const res = detectSuspiciousPatterns(text);
        return { hasArtifacts: res.detected, details: res.matches };
    },
    computeAnswerIntegrity,
    evaluateAnswerPlagiarism
};
