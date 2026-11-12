const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateAnswerPlagiarism } = require('../services/integrity');

test('Plagiarism Engine: Comprehensive answer assessment', async (t) => {
    await t.test('clean authentic answer has 0% or low plagiarism score', () => {
        const text = 'In React, the useEffect hook allows performing side effects like fetching data or setting timers after the component renders.';
        const ideal = 'useEffect runs after render and handles subscriptions, DOM mutations, and API requests.';
        const telemetry = {
            pasteAttempts: 0,
            keystrokesCount: 140,
            totalCharsTyped: 135,
            largestInsertLength: 4,
            typingDurationMs: 30000
        };

        const result = evaluateAnswerPlagiarism({
            answer: text,
            idealAnswer: ideal,
            telemetry
        });

        assert.equal(result.riskLevel, 'low');
        assert.ok(result.originalityScore >= 80);
        assert.equal(result.isPlagiarized, false);
    });

    await t.test('detects high verbatim similarity with ideal answer', () => {
        const ideal = 'Use backtracking row by row. Maintain hash sets for columns, main diagonals, and anti-diagonals. When row equals n, record board.';
        const answer = 'Use backtracking row by row. Maintain hash sets for columns, main diagonals, and anti-diagonals. When row equals n, record board.';

        const result = evaluateAnswerPlagiarism({
            answer,
            idealAnswer: ideal,
            telemetry: { pasteAttempts: 0, keystrokesCount: 150, typingDurationMs: 40000 }
        });

        assert.ok(result.plagiarismScore >= 50);
        assert.ok(result.flags.highIdealSimilarity);
        assert.ok(result.detectedSources.length > 0);
    });

    await t.test('detects clipboard paste and fast typing injection', () => {
        const answer = 'A binary search tree is a rooted binary tree data structure whose internal nodes each store a key greater than all the keys in the node left subtree and less than those in its right subtree.';
        const telemetry = {
            pasteAttempts: 1,
            keystrokesCount: 5,
            largestInsertLength: 180,
            typingDurationMs: 1200 // 1.2 seconds!
        };

        const result = evaluateAnswerPlagiarism({
            answer,
            telemetry
        });

        assert.ok(result.plagiarismScore >= 40);
        assert.ok(result.flags.clipboardPasteInjection);
    });

    await t.test('detects AI generated formatting and boilerplate signatures', () => {
        const aiText = `### Understanding Distributed Locks
Here is a comprehensive breakdown:
1. **Redlock Algorithm**: Multi-node safety consensus.
2. **TTL Expiry**: Prevents deadlocks.
In conclusion, it is crucial to handle clock drift.`;

        const result = evaluateAnswerPlagiarism({
            answer: aiText,
            telemetry: { pasteAttempts: 0, keystrokesCount: 100, typingDurationMs: 30000 }
        });

        assert.ok(result.flags.aiSignaturesDetected);
        assert.ok(result.plagiarismScore >= 25);
    });

    await t.test('detects ChatGPT-copied code with comments and paste injection', () => {
        const chatGptCode = `// Time Complexity: O(2^N)
// Space Complexity: O(N)
// Helper function to solve recursion
function solveNQueens(n) {
    const result = [];
    const board = Array.from({ length: n }, () => '.'.repeat(n));
    // Base case: all queens placed
    return result;
}`;

        const telemetry = {
            pasteAttempts: 1,
            keystrokesCount: 12,
            largestInsertLength: 210,
            typingDurationMs: 2500
        };

        const result = evaluateAnswerPlagiarism({
            answer: chatGptCode,
            telemetry,
            questionType: 'coding'
        });

        assert.ok(result.flags.clipboardPasteInjection);
        assert.ok(result.flags.aiSignaturesDetected);
        assert.ok(result.plagiarismScore >= 60);
        assert.equal(result.isPlagiarized, true);
        assert.equal(result.status, 'Flagged (High Risk)');
    });
});
