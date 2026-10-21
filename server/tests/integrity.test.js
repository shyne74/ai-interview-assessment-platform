const test = require('node:test');
const assert = require('node:assert/strict');
const {
    computeAnswerIntegrity,
    calculateJaccardSimilarity,
    detectMarkdownOrBulletBoilerplate
} = require('../services/integrity');

test('Integrity Service: Anti-Copy & AI Detection', async (t) => {
    await t.test('clean authentic keystroke response yields low risk', () => {
        const text = 'To optimize MongoDB query performance, one should create proper compound indexes on frequently queried fields, use projection to return only needed fields, and analyze queries with explain plans.';
        const telemetry = {
            pasteAttempts: 0,
            keystrokesCount: 160,
            totalCharsTyped: 165,
            largestInsertLength: 4,
            typingDurationMs: 45000 // 45 seconds
        };

        const result = computeAnswerIntegrity({
            userAnswer: text,
            telemetry,
            idealAnswer: 'Use compound indexes, avoid full collection scans, and use explain executionStats.'
        });

        assert.equal(result.riskLevel, 'low');
        const activeFlags = Object.values(result.flags).filter(Boolean);
        assert.equal(activeFlags.length, 0);
        assert.equal(result.details.pasteAttempts, 0);
    });

    await t.test('detects multiple paste attempts and large single insert', () => {
        const text = 'A microservices architecture separates application concerns into loosely coupled services.';
        const telemetry = {
            pasteAttempts: 2,
            keystrokesCount: 3,
            totalCharsTyped: 90,
            largestInsertLength: 87, // entire block pasted at once
            typingDurationMs: 2000
        };

        const result = computeAnswerIntegrity({
            userAnswer: text,
            telemetry
        });

        assert.ok(result.riskLevel === 'high' || result.riskLevel === 'medium');
        assert.ok(result.flags.pasteDetected === true);
        assert.ok(result.reasons.length > 0);
    });

    await t.test('detects implausible typing speed (e.g. 500 chars in 3 seconds)', () => {
        const text = 'Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser. It uses an event-driven, non-blocking I/O model that makes it lightweight and efficient. Node.js has an event loop that runs in a single thread, although background operations can be delegated to worker threads via libuv. This makes Node.js well suited for building scalable network applications that require high I/O concurrency without thread overhead.';
        const telemetry = {
            pasteAttempts: 0,
            keystrokesCount: 10,
            totalCharsTyped: 450,
            largestInsertLength: 440,
            typingDurationMs: 2500 // 2.5 seconds for 450 chars!
        };

        const result = computeAnswerIntegrity({
            userAnswer: text,
            telemetry
        });

        assert.equal(result.riskLevel, 'high');
        assert.ok(result.flags.fastTypingSpeed === true);
    });

    await t.test('detects AI markdown boilerplate artifacts in plain-text answers', () => {
        const aiAnswer = `### Comprehensive Analysis
Here is a breakdown of the key concepts:
* **Item 1:** The primary factor is thread pool saturation.
* **Item 2:** Non-blocking operations prevent event loop lag.
In conclusion, the architecture is robust.`;

        const result = detectMarkdownOrBulletBoilerplate(aiAnswer);
        assert.equal(result.hasArtifacts, true);
        assert.ok(result.details.length > 0);
    });

    await t.test('detects near-identical text overlap with ideal answer', () => {
        const ideal = 'Docker containers encapsulate application code with dependencies into an isolated runtime image.';
        const candidate = 'Docker containers encapsulate application code with dependencies into an isolated runtime image.';

        const similarity = calculateJaccardSimilarity(candidate, ideal);
        assert.ok(similarity > 0.95);
    });
});
